
Param([String] $SkipLayer)

$images = (docker image ls -a)
# echo "$images"

If  ( $images -notmatch "quick-lambda" ) {
  docker build -t quick-lambda --progress tty -f $PSScriptRoot\quick-lambda\Dockerfile $PSScriptRoot
}

docker run --rm -v "$Home/.aws:/aws" -v "$(Get-Location):/src" -e "LAMBDA_NAME=Netlab3" -e "SKIP_LAYER=$SkipLayer" quick-lambda
# docker run --rm -v "$Home/.aws:/aws" -v "$(Get-Location):/src" -e "LAMBDA_NAME=Netlab3" quick-lambda
