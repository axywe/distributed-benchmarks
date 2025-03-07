package utils

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

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
