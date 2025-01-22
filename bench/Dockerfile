FROM axywewastaken/boela:0.1

WORKDIR /app

COPY bench/ /app/

RUN pip install sqlalchemy psycopg2-binary tabulate pandas openpyxl

ARG ARGS

ENV CMD_ARGS=$ARGS

CMD ["sh", "-c", "python /app/run.py $CMD_ARGS && cp /app/results.* /results/"]
