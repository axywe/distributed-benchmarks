package utils

import (
	"context"
	"fmt"
	"net/http"
	"os/exec"
	"strings"
	"time"
)

func BuildArgs(r *http.Request) ([]string, error) {
	dimension := r.FormValue("dimension")
	instanceID := r.FormValue("instance_id")
	nIter := r.FormValue("n_iter")
	algorithm := r.FormValue("algorithm")

	seed := r.FormValue("seed")
	nParticles := r.FormValue("n_particles")
	inertiaStart := r.FormValue("inertia_start")
	inertiaEnd := r.FormValue("inertia_end")
	nostalgia := r.FormValue("nostalgia")
	societal := r.FormValue("societal")
	topology := r.FormValue("topology")
	tolThres := r.FormValue("tol_thres")
	tolWin := r.FormValue("tol_win")

	var argsList []string

	if dimension != "" {
		argsList = append(argsList, "--dimension", dimension)
	}
	if instanceID != "" {
		argsList = append(argsList, "--instance_id", instanceID)
	}
	if nIter != "" {
		argsList = append(argsList, "--n_iter", nIter)
	}
	if algorithm != "" {
		argsList = append(argsList, "--algorithm", algorithm)
	}
	if seed != "" {
		argsList = append(argsList, "--seed", seed)
	}
	if nParticles != "" {
		argsList = append(argsList, "--n_particles", nParticles)
	}
	if inertiaStart != "" {
		argsList = append(argsList, "--inertia_start", inertiaStart)
	}
	if inertiaEnd != "" {
		argsList = append(argsList, "--inertia_end", inertiaEnd)
	}
	if nostalgia != "" {
		argsList = append(argsList, "--nostalgia", nostalgia)
	}
	if societal != "" {
		argsList = append(argsList, "--societal", societal)
	}
	if topology != "" {
		argsList = append(argsList, "--topology", topology)
	}
	if tolThres != "" {
		argsList = append(argsList, "--tol_thres", tolThres)
	}
	if tolWin != "" {
		argsList = append(argsList, "--tol_win", tolWin)
	}
	return argsList, nil
}

func RunCommand(args []string) ([]byte, error) {
	argsString := strings.Join(args, " ")

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "make", "docker", fmt.Sprintf("ARGS=%s", argsString))
	output, err := cmd.CombinedOutput()
	if ctx.Err() == context.DeadlineExceeded {
		return output, fmt.Errorf("команда превысила лимит времени")
	}
	return output, err
}
