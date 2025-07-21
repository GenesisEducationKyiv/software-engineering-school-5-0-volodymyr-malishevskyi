#!/bin/sh

# Set up git hooks path
git config core.hooksPath .git-hooks || echo 'Not in a root of git repo'