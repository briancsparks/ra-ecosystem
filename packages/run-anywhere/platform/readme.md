# Platform Model

The main feature of Run-anywhere is that your code has lots of
places that it can be run. The _platform_ section of the code is
where Run-anywhere accomplishes this.

* platform/app - puts together other pieces to instantiate.
  * Since Run-anywhere is a mix-and-match environment, someone has to
    do the mixing and matching. The user of the Run-anywhere module
    will have to do some of this work, but _platform/app_ has many
    samples to start from.
* platform/host - Provides a host, if the environment does not.
  * Several hosts provide this functionality, so there is nothing to
    do when instantiating for that host. But some environments do not
    provide the host. (Aws Lambda provides a host, while launching
    from the CLI does not.)
* platform/entrypoint
  * The first to receive a request.
  * In theory, translates incoming requests into the _argv, context_ standard
    format, but in reality this task is usually done in the host.
  * Translates responses to the final format.
* platform/service-platform
  * The service that the app is running on. (Like AWS Lambda vs. a developers
    workstation.)
* platform/middleware
  * Always take the standard _argv, context_ formatted input, and
  * Always gives the standard output.
