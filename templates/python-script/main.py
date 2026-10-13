"""A dependency-free command-line greeting; extend main() with your own work."""
import argparse


def main(argv=None):
    parser = argparse.ArgumentParser(description='A small Python starter.')
    parser.add_argument('--name', default='world', help='Name to greet')
    args = parser.parse_args(argv)
    print(f'Hello, {args.name}! Welcome to {{projectName}}.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
