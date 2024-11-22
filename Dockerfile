FROM axywewastaken/boela:0.1

WORKDIR /app

COPY python/ /app/

ARG ARGS

ENV CMD_ARGS=$ARGS

CMD ["sh", "-c", "python /app/bench_run.py $CMD_ARGS"]
