# Using Different AWS Accounts

## CLI vs NodeJs library vs. scripts in a container

### CLI

If you are going to run a command from the CLI, switching to another account is easy.
Just `export AWS_PROFILE="whatever"`, and things 'just work'.

### NodeJs Library

You have to use `aws sts assume-role` and then use the response JSON to fill in the
appropriate env vars. There is a script in dotfiles called `assume-role`, however to
make it easy.

```sh
. `which assume-role` acctnum
```

### Inside Docker Container

All you have to do in order to make this work is to mount the `.aws` dir into the container and set
`AWS_SHARED_CREDENTIALS_FILE` and `AWS_CONFIG_FILE`, and export / push `AWS_PROFILE` into the container.
