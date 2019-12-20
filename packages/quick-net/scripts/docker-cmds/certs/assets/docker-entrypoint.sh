#!/bin/bash -e

the_script="/work/bin/$1"
# stat "$the_script" || echo "cannot stat $the_script"
# ls -l /project
# pwd

# echo $the_script
# if [[ -f "$the_script" ]]; then
#   echo "its alive"
#   # exit 3
# fi

if [ -f "$the_script" ]; then
  shift
  "$the_script" "$@"
  exit "$?"
fi

exec "$@"
