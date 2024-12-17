FROM axywewastaken/boela:0.1

WORKDIR /app

COPY bench/ /app/

COPY .env /app/

RUN pip install sqlalchemy psycopg2-binary

ARG ARGS

ENV CMD_ARGS=$ARGS

CMD ["sh", "-c", "python /app/run.py $CMD_ARGS"]
