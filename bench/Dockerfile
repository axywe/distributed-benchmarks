FROM axywewastaken/boela:0.1

WORKDIR /app

COPY bench/ /app/

RUN pip install sqlalchemy psycopg2-binary tabulate pandas openpyxl

ARG ARGS

ENV CMD_ARGS=$ARGS

CMD ["sh", "-c", "python /app/run.py $CMD_ARGS && cp /app/results.* /results/"]

# CMD ["tail", "-f", "/dev/null"]

# --dimension 2 --instance_id 0 --n_iter 10 --algorithm 1 --seed 0 --n_particles 15 --inertia_start 0.9 --inertia_end 0.4 --nostalgia 2.1 --societal 2.1 --topology gbest --tol_win 5