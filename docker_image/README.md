Boela Docker

### Description of Program Parameters

| Parameter             | Type       | Default Value                   | Description                                                                                      | Example Usage                                              |
|-----------------------|------------|----------------------------------|--------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| `--dimensions`        | `int`      | `[2, 5, 10]`                    | List of problem dimensions to analyze.                                                          | `--dimensions 2 10`                                       |
| `--initial_samples`   | `int`      | `[10, 20]`                      | List of initial sample sizes used for optimization.                                              | `--initial_samples 10 15`                                 |
| `--restarts`          | `int`      | `[5, 10]`                       | List of restart counts for the optimizer to improve result accuracy.                             | `--restarts 5 20`                                         |
| `--seeds`             | `int`      | `15`                            | Number of random runs to assess the stability of results.                                        | `--seeds 10`                                              |
| `--metrics`           | `str`      | `["NONE", "R2_CV", "SUIT_EXT", "VM_ANGLES_EXT"]` | List of metrics used for analysis and optimization. Available values: `NONE`, `R2_CV`, `SUIT_EXT`, `VM_ANGLES_EXT`. | `--metrics NONE R2_CV`                                    |
