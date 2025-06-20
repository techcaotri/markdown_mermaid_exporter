#!/bin/bash

# This script runs the extract-mermaid-to-png.js Node.js script with the provided arguments.
# Usage: ./run_extract.sh <input_file> <output_directory>
node extract-mermaid-to-png.js "$1" "$2"
