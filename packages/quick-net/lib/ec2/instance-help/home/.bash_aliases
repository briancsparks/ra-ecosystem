
alias fn='find . -type f | egrep -i '
alias fd='find . -type d | egrep -i '

alias h='history'
alias hi='history | egrep -i '
alias vim='vim -p'
alias tree="tree -I 'node_modules|bower_components|ppds|_tmp|cmake-build|doxygen-build'"

alias scpix='scp -o "StrictHostKeyChecking no" -o UserKnownHostsFile=/dev/null -o ConnectTimeout=1 -o LogLevel=quiet $@'
alias gpff='git pull --ff-only'
alias gru='git remote update'
alias cls='printf "\ec"'
