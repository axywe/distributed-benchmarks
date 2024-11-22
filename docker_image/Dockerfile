FROM python:3.11-slim-buster

RUN apt update && \
    apt install -y \
    git \
    build-essential \
    openssh-client && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip

RUN git clone https://github.com/IOHprofiler/IOHexperimenter.git /tmp/ioh
RUN git clone https://github.com/pybind/pybind11.git /tmp/ioh/external/pybind11
RUN git clone https://github.com/nlohmann/json.git /tmp/ioh/external/json
RUN git clone https://github.com/fmtlib/fmt.git /tmp/ioh/external/fmt
RUN git clone https://github.com/jarro2783/cxxopts.git /tmp/ioh/external/cxxopts
RUN git clone https://github.com/tobiasvandriessel/problem-generator.git /tmp/ioh/external/problem-generator
RUN pip install /tmp/ioh

RUN git clone https://github.com/agataleh/boela.git /tmp/boela && \
    pip install --no-cache-dir /tmp/boela

RUN rm -rf /tmp/ioh /tmp/boela