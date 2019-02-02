
# Making DEB Files

## The Easy Way

Get and install CheckInstall:

```sh
sudo apt-get install -y "checkinstall"
```

## The Official Way

## Deps

```sh
sudo apt-get install -y build-essential
sudo apt-get install -y autoconf automake autotools-dev \
      debhelper dh-make debmake devscripts \
      fakeroot file git gnupg lintian \
      patch patchutils pbuilder \
      perl python quilt xutils-dev
```
