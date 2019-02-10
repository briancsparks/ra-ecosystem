
const sg                      = require('sg-template');

const template = function(argv_, context = {}) {

  var   argv        = argv_                                     || {};

  var   t = sg.template(__filename, {module, argv, context});

  const sdkver    = `r23.0.2`;
  const sdkfile   = `android-sdk_${sdkver}-linux.tgz`;
  const sdk       = `http://dl.google.com/android/${sdkfile}`;

  const ndkver    = `r10c`;
  const ndkfile   = `android-ndk-${ndkver}-linux-x86_64.bin`;
  const ndk       = `http://dl.google.com/android/ndk/${ndkfile}`;

  t.comment(`Complie Curl for Android`);
  t.FROM(`ubuntu`);

  t.comment(true, `Install compilation tools`);

  t.packages('curl');

  t.append(`

    # Download SDK / NDK

    RUN mkdir /Android && cd Android && mkdir output
    WORKDIR /Android

    RUN curl -OL '${sdk}'
    RUN curl -OL '${ndk}'
    `);

  t.packages('curl,p7zip-full');

  t.append(`
    # Extracting ndk/sdk

    RUN tar -xvzf android-sdk_r23.0.2-linux.tgz && \\
      chmod a+x android-ndk-r10c-linux-x86_64.bin && \\
      7z x android-ndk-r10c-linux-x86_64.bin
      `);

  t.packages(
    'automake,build-essential',
    'wget',
    'bash,tree');

  t.append(`
    # Set ENV variables

    ENV ANDROID_HOME  /Android/android-sdk-linux
    ENV NDK_ROOT      /Android/android-ndk-r10c
    ENV PATH          $PATH:$ANDROID_HOME/tools
    ENV PATH          $PATH:$ANDROID_HOME/platform-tools

    # Make stand alone toolchain (Modify platform / arch here)

    RUN mkdir=toolchain-arm && \\
      bash $NDK_ROOT/build/tools/make-standalone-toolchain.sh --verbose \\
      --platform=android-19 \\
      --install-dir=toolchain-arm \\
      --arch=arm \\
      --toolchain=arm-linux-androideabi-4.9 \\
      --system=linux-x86_64

    ENV TOOLCHAIN /Android/toolchain-arm
    ENV SYSROOT $TOOLCHAIN/sysroot
    ENV PATH $PATH:$TOOLCHAIN/bin:$SYSROOT/usr/local/bin

    # Configure toolchain path

    ENV ARCH armv7

    ENV CROSS_COMPILE arm-linux-androideabi
    ENV CC arm-linux-androideabi-gcc
    ENV CXX arm-linux-androideabi-g++
    ENV AR arm-linux-androideabi-ar
    ENV AS arm-linux-androideabi-as
    ENV LD arm-linux-androideabi-ld
    ENV RANLIB arm-linux-androideabi-ranlib
    ENV NM arm-linux-androideabi-nm
    ENV STRIP arm-linux-androideabi-strip
    ENV CHOST arm-linux-androideabi

    ENV CPPFLAGS -std=c++11

    # download, configure and make Zlib

    RUN curl -LO http://zlib.net/zlib-1.2.11.tar.gz && \\
      tar -xzf zlib-1.2.11.tar.gz && \\
      mv zlib-1.2.11 zlib

    RUN cd zlib && ./configure --static && \\
      make && \\
      ls -hs . && \\
      cp libz.a /Android/output

    # Download and extract curl

    ENV CFLAGS -v -DANDROID --sysroot=$SYSROOT -mandroid -march=$ARCH -mfloat-abi=softfp -mfpu=vfp -mthumb
    ENV CPPFLAGS $CPPFLAGS $CFLAGS
    ENV LDFLAGS -L$TOOLCHAIN/include


    RUN curl -LO http://curl.haxx.se/download/curl-7.64.0.tar.gz && \\
      tar -xzf curl-7.64.0.tar.gz

    RUN cd curl-7.64.0 && \\
      ./configure --host=arm-linux-androideabi \\
          --disable-shared \\
          --enable-static \\
          --disable-dependency-tracking \\
          --with-zlib=/Android/zlib \\
          --without-ca-bundle \\
          --without-ca-path \\
          --enable-ipv6 \\
          --disable-ftp \\
          --disable-file \\
          --disable-ldap \\
          --disable-ldaps \\
          --disable-rtsp \\
          --disable-proxy \\
          --disable-dict \\
          --disable-telnet \\
          --disable-tftp \\
          --disable-pop3 \\
          --disable-imap \\
          --disable-smtp \\
          --disable-gopher \\
          --disable-sspi \\
          --disable-manual \\
          --target=arm-linux-androideabi \\
          --build=x86_64-unknown-linux-gnu || cat config.log

    # Make curl

    RUN cd curl-7.64.0 && \\
      make && \\
      ls lib/.libs/ && \\
      cp lib/.libs/libcurl.a /Android/output && \\
      ls -hs /Android/output && \\
      mkdir /output


    # ziplib

    RUN curl -LO http://www.nih.at/libzip/libzip-0.11.2.tar.gz && \\
      tar -xzf libzip-0.11.2.tar.gz && \\
      mv libzip-0.11.2 libzip && \\
      cd libzip && \\
      ./configure --help && \\
      ./configure --enable-static --host=arm-linux-androideabi --target=arm-linux-androideabi && \\
      make && \\
      ls -hs lib && \\
      cp lib/.libs/libzip.a /Android/output && \\
      mkdir /Android/output/ziplib && \\
      cp lib/*.c /Android/output/ziplib && \\
      cp lib/*.h /Android/output/ziplib && \\
      cp config.h /Android/output/ziplib


    # To get the results run container with output folder
    # Example: docker run -v HOSTFOLDER:/output --rm=true IMAGENAME

    RUN tree /Android/output
    RUN pwd
    RUN ls -l
    RUN ls -l /Android/output

    ENTRYPOINT cp -r /Android/output/* /output
    `);


    return t;
};

module.exports = template;
