docker:
	docker build -t boela-docker .
	docker run -it boela-docker python /app/bench_run.py --dimensions 2 10 --initial_samples 10 20 --restarts 5 10 --seeds 20 --metrics NONE R2_CV SUIT_EXT
