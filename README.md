# Boela: Distributed Benchmarking System

**Boela** is a distributed benchmarking platform for running optimization algorithms in isolated Docker containers, managing experiments, and tracking user results.

## Project Structure

* `backend/` — Go server providing the API and integration with Docker and PostgreSQL.
* `frontend/` — React-based web frontend for users and administrators.
* `bench/` — Dockerfile and utilities for building and running optimization containers.
* `database/` — Initialization scripts and Dockerfile for PostgreSQL database.
* `results/` — Directory for saving benchmark outputs (e.g., `results.json`, `results.csv`).
* `.env` — Environment variables configuration.

---

## Key Makefile Commands

| Command         | Description                                                                                  |
| :-------------- | :------------------------------------------------------------------------------------------- |
| `make clean`    | Stop and remove all benchmark containers and delete custom images.                           |
| `make run`      | Start the backend Go server. Automatically ensures the database is running (`make db-up`).   |
| `make frontend` | Start the frontend development server (`npm start`).                                         |
| `make db`       | Start the PostgreSQL database using Docker Compose.                                          |
| `make db-down`  | Stop and remove the database containers.                                                     |

---

## How to Run the Project

1. **Clone the repository**:

   ```bash
   git clone https://gitlab.com/Taleh/distributed-benchmarks.git
   cd boela
   ```

1. **Copy env file**:

   ```bash
   cp .env.dist .env
   ```

3. **Start the PostgreSQL and Redis**:

   ```bash
   make db
   ```

4. **Run the backend server**:

   ```bash
   make run
   ```

5. **Run the frontend**:

   ```bash
   make frontend
   ```

---

## Requirements

* Go 1.20+
* Node.js 18+
* Docker 20.10+
* Docker Compose
* Redis server