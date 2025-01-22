import numpy as np


class PSO:
    """
    Particle Swarm Optimisation implementation

    References:
    Eberhart, R.C., Shi, Y., 2001. Particle swarm optimization: developments,
    applications and resources, in: Proceedings of the 2001 Congress on
    Evolutionary Computation. Presented at the Congress on Evolutionary
    Computation, pp. 81-86.

    Kennedy, J., Mendes, R., 2002. Population structure and particle swarm
    performance. IEEE, pp. 1671-1676.

    Xu, S., Rahmat-Samii, Y., 2007. Boundary conditions in particle swarm
    optimization revisited. IEEE Transactions on Antennas and Propagation,
    55, 760-765.

    """

    def __init__(
        self,
        obj_func,
        box_bounds,
        n_particles=5,
        topology="gbest",
        inertia_start=0.9,
        inertia_end=0.4,
        nostalgia=2.1,
        societal=2.1,
    ):
        """Initialise the positions and velocities of the particles, the
        particle memories and the swarm-level params.

        Keyword args:
        obj_func -- Objective function (ref stored in the attribute
                    'orig_obj_func')
        box_bounds -- tuple of (lower_bound, upper_bound) tuples (or
                  equivalent ndarray), the length of the former being the
                  number of dimensions e.g. ((0,10),(0,30)) for 2 dims.
                  Restricted damping is used (Xu and Rahmat-Samii, 2007) when
                  particles go out of bounds.
        n_particles -- number of particles
        topology -- 'gbest', 'ring' or 'von_neumann'
        inertia_start -- particle inertia weight at first iteration
                           (recommended value: 0.9)
        inertia_end -- particle inertia weight at maximum possible iteration
                         (recommended value: 0.4)
        nostalgia -- weight for velocity component in direction of particle
                       historical best performance (recommended value: 2.1)
        societal -- weight for velocity component in direction of current
                      best performing particle in neighbourhood (recommended
                      value: 2.1)

        Notes on swarm and neighbourhood sizes (Eberhart and Shi, 2001)
        Swarm size of 20-50 most common.
        Neighbourhood size of ~15% swarm size used in many applications.

        Notes on topologies:
        Two neighbourhood topologies have been implemented (see Kennedy and
        Mendes, 2002).  These are both social rather than geographic
        topologies and differ in terms of degree of connectivity (number of
        neighbours per particle) but not in terms of clustering (number of
        common neighbours of two particles).  The supported topologies are:
        ring -- exactly two neighbours / particle
        von_neumann -- exactly four neighbours / particle (swarm size must
                       be square number)
        gbest -- the neighbourhood of each particle is the entire swarm

        Notes on weights (Eberhart and Shi, 2001, Xu and Rahmat-Samii, 2007):
        inertia weight   -- decrese linearly from 0.9 to 0.4 over a run
        nostalgia weight -- 2.05
        societal weight -- 2.05
        NB sum of nostalgia and societal weights should be >4 if using
        Clerc's constriction factor.

        Notes on parallel objective function evaluation:
        This may not be efficient if a single call to the objective function
        takes very little time to execute.
        """
        self.swarm_best_hist = None
        self.swarm_best_perf_hist = None
        self.inertia_start = inertia_start
        self.inertia_end = inertia_end
        self.nostalgia = nostalgia
        self.societal = societal

        # Create a vectorized version of that function
        # for fast single-threaded execution
        self.obj_func_vectorized = obj_func  # np.vectorize(obj_func)

        # Determine the problem space boundaries
        # NB: should really parse box_bounds to ensure that it is valid
        self.lower_bounds, self.upper_bounds = np.asfarray(box_bounds).T
        if np.any(self.lower_bounds >= self.upper_bounds):
            raise ValueError("All lower bounds must be < upper bounds")

        # Set number of particles
        self._n_parts = n_particles
        # Set number of dimensions
        self._n_dims = len(box_bounds)
        # Initialise particle positions
        # Each row is the position vector of a particular particle
        self.pos = np.random.uniform(
            self.lower_bounds, self.upper_bounds, (self._n_parts, self._n_dims)
        )

        # Previous best position for all particles is starting position
        self.pbest = self.pos.copy()

        self.vel_max = self.upper_bounds - self.lower_bounds
        # Initialise velocity matrix
        # Each row is the velocity vector of a particular particle
        self.vel = np.random.uniform(
            -self.vel_max, self.vel_max, (self._n_parts, self._n_dims)
        )

        # Find the performance per particle
        # (updates self.perf, a matrix of self._n_parts rows and
        # self._n_dims cols)
        self.perf = np.array(
            list(map(self.obj_func_vectorized, self.pos))
        )  # self.obj_func_vectorized(*self.pos.T)

        # The personal best position per particle is initially the starting
        # position
        self.pbest_perf = self.perf.copy()

        # Initialise swarm best position (array of length self._n_dims)
        # and the swarm best performance  (scalar)
        self.swarm_best = self.pos[self.perf.argmin()]
        self.swarm_best_perf = self.perf.min()

        # Determine particle neighbours if a swarm topology has been chosen
        self._cache_neighbourhoods(topology)

    def _cache_neighbourhoods(self, topology):
        """Determines the indices of the neighbours per particle and stores them
        in the neighbourhoods attribute.

        Currently only the following topologies are supported (see Kennedy and
        Mendes, 2002):

        'gbest' - Global best (no local particle neighbourhoods)
        'von_neumann' -- Von Neumann lattice (each particle communicates with
                         four social neighbours)
        'ring' -- Ring topology (each particle communicates with two social
                  neighbours)

        """
        self.topology = topology
        n = self._n_parts
        if self.topology == "gbest":
            return
        elif self.topology == "von_neumann":
            # Check that p_idx is square
            n_sqrt = int(np.sqrt(n))
            if not n_sqrt**2 == n:
                raise Exception(
                    "Number of particles needs to be perfect square "
                    + "if using Von Neumann neighbourhood topologies."
                )
            self.neighbourhoods = np.zeros((n, 5), dtype=int)
            for p in range(n):
                self.neighbourhoods[p] = [
                    p,  # particle
                    (p - n_sqrt) % n,  # p'cle above
                    (p + n_sqrt) % n,  # p'cle below
                    ((p // n_sqrt) * n_sqrt) + ((p + 1) % n_sqrt),  # p'cle to r
                    ((p // n_sqrt) * n_sqrt) + ((p - 1) % n_sqrt),  # p'cle to l
                ]
        elif self.topology == "ring":
            self.neighbourhoods = np.zeros((n, 3), dtype=int)
            for p in range(n):
                self.neighbourhoods[p] = [
                    (p - 1) % n,  # particle to left
                    p,  # particle itself
                    (p + 1) % n,  # particle to right
                ]
        elif self.topology == "cluster":
            n_clusters = int(np.sqrt(n))
            p2cluster = int(n / n_clusters)
            self.neighbourhoods = np.zeros((n, p2cluster), dtype=int)
            for p in range(0, n_clusters * p2cluster, p2cluster):
                self.neighbourhoods[p] = range(p + 1, p + p2cluster + 1)
                if p + p2cluster == n_clusters * p2cluster:
                    self.neighbourhoods[p][-1] = 0
                for i in range(p + 1, p + p2cluster):
                    self.neighbourhoods[i] = range(p, p + p2cluster)
                    self.neighbourhoods[i][i - p] = p
        else:
            raise Exception("Topology is not recognised/supported")

    def _velocity_updates(self, itr, max_iterations, use_constr_factor=True):
        """Update particle velocities.

        Keyword arguments:
        itr     -- current timestep
        max_iterations -- maximum number of timesteps
        use_constr_factor -- whether Clerc's constriction factor should be
                             applied

        New velocities determined using
         - the supplied velocity factor weights
         - random variables to ensure the process is not deterministic
         - the current velocity per particle
         - the best performing position in each particle's personal history
         - the best performing current position in each particle's neighbourhood

        Max velocities clamped to length of problem space boundaries and
        Clerc's constriction factor applied as per Eberhart and Shi (2001)

        NB should only be called from the VCDM class's _tstep method.
        """
        w_inertia = self.inertia_start + (self.inertia_end - self.inertia_start) * (
            itr / float(max_iterations)
        )

        inertia_vel_comp = w_inertia * self.vel
        nostalgia_vel_comp = self.nostalgia * np.random.rand() * (self.pbest - self.pos)
        societal_vel_comp = (
            self.societal * np.random.rand() * (self.best_neigh - self.pos)
        )

        self.vel = inertia_vel_comp + nostalgia_vel_comp + societal_vel_comp

        # Constriction factor
        if use_constr_factor:
            phi = self.nostalgia + self.societal
            if phi <= 4:
                raise Exception(
                    "Cannot apply constriction factor as sum of societal and nostalgic weights <= 4"
                )
            self.vel *= 2.0 / np.abs(2.0 - phi - np.sqrt((phi**2) - (4.0 * phi)))

        # Velocity clamping
        self.vel.clip(-self.vel_max, self.vel_max, out=self.vel)

    def _box_bounds_checking(self):
        """Apply restrictive damping if position updates have caused particles
        to leave problem space boundaries.

        Restrictive damping explained in:
        Xu, S., Rahmat-Samii, Y. (2007). Boundary conditions in particle swarm
        optimization revisited. IEEE Transactions on Antennas and Propagation,
        vol 55, pp 760-765.
        """
        too_low = self.pos < self.lower_bounds
        too_high = self.pos > self.upper_bounds

        # Ensure all particles within box bounds of problem space
        self.pos.clip(self.lower_bounds, self.upper_bounds, out=self.pos)

        old_vel = self.vel.copy()
        self.vel[too_low | too_high] *= -np.random.random(
            (self.vel[too_low | too_high]).shape
        )

        if np.array_equal(old_vel, self.vel) and np.any(too_low | too_high):
            raise Exception("Velocity updates in boundary checking code not worked")

        # What if reflected particles now comes out the other side of the
        # problem space? TODO
        too_low = self.pos < self.lower_bounds
        too_high = self.pos > self.upper_bounds
        if np.any(too_low) or np.any(too_high):
            raise Exception("Need multiple-pass bounds checking")

    def _tstep(self, itr, max_iterations):
        """Optimisation timestep function

        Keyword arguments:
        itr -- current timestep
        max_iterations -- maximum number of timesteps
        """
        if self.topology == "gbest":
            # self.topology == "gbest". For the 'global best' approach the best
            # performing neighbour is the best performing particle in the entire
            # swarm
            self.best_neigh = self.swarm_best
        else:
            # For each particle, find the 'relative' index of the best
            # performing neighbour e.g. 0, 1 or 2 for particles in ring
            # topologies
            best_neigh_idx = np.choose(
                self.perf[self.neighbourhoods].argmin(axis=1), self.neighbourhoods.T
            )
            # then generate a vector of the _positions_ of the best performing
            # particles in each neighbourhood (the length of this vector will be
            # equal to the number of particles)
            self.best_neigh = self.pos[best_neigh_idx]

        # Update the velocity and position of each particle
        self._velocity_updates(itr, max_iterations)
        self.pos += self.vel

        # Check that all particles within problem boundaries;
        # if not move to edges of prob space and
        # flip signs of and dampen velocity components that took particles
        # over boundaries
        self._box_bounds_checking()

        # Cache the current performance per particle
        self.perf = np.array(
            list(map(self.obj_func_vectorized, self.pos))
        )  # self.obj_func_vectorized(*self.pos.T)

        # Update each particle's personal best position if an improvement has
        # been made this timestep
        improvement_made_idx = self.perf < self.pbest_perf
        self.pbest[improvement_made_idx] = self.pos[improvement_made_idx]
        self.pbest_perf[improvement_made_idx] = self.perf[improvement_made_idx]

        # Update swarm best position with current best particle position
        self.swarm_best = self.pos[self.perf.argmin()]
        self.swarm_best_perf = self.perf.min()

        return self.swarm_best, self.swarm_best_perf

    def run(self, max_iterations=100, tol_thres=None, tol_win=5):
        """Attempt to find the global optimum objective function.

        Keyword args:
        max_iterations -- maximum number of iterations
        tol_thres -- convergence tolerance vector (optional); length must be
                     equal to the number of dimensions.  Can be ndarray, tuple
                     or list.
        tol_win -- number of timesteps for which the swarm best position must be
                   less than convergence tolerances for the funtion to then
                   return a result

        Returns:
         -- swarm best position
         -- performance at that position
         -- iterations taken to converge

        """
        self.swarm_best_hist = np.zeros((max_iterations, self._n_dims))
        self.swarm_best_perf_hist = np.zeros((max_iterations,))
        # Check tolerance vector shape
        if tol_thres is not None:
            if np.asfarray(tol_thres).shape != (self._n_dims,):
                raise Exception(
                    "The length of the tolerance vector must be equal to the number of dimensions"
                )
        # Launch iterations
        for itr in np.arange(max_iterations):
            self.swarm_best_hist[itr], self.swarm_best_perf_hist[itr] = self._tstep(
                itr, max_iterations
            )
            # If the convergence tolerance has been reached then return
            if tol_thres is not None and itr > tol_win:
                win = self.swarm_best_hist[itr - tol_win + 1 : itr + 1]
                if np.all(win.max(axis=0) - win.min(axis=0) < tol_thres):
                    break
            itr += 1

        return self.swarm_best, self.swarm_best_perf, itr