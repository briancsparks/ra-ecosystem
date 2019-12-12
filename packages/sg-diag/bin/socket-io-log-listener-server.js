
/**
 *
 */
const sg                      = require('sg-argv');
const _                       = sg._;

const ARGV                    = sg.ARGV();
const port                    = ARGV.port     || 3332;

if (require.main === module) {
  const app                     = require('express')();
  const server                  = require('http').createServer(app);
  const io                      = require('socket.io')(server);                 // Use `export DEBUG='*'` before starting to see all traffic

  app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/socket-io-log-listener-server/index.html`);
  });

  var nextId  = 0;
  var count   = 0;

  io.on('connection', (socket) => {
    const id    = nextId++;
    const name  = `user${id}`;

    console.log(`connection from ${name}`, {name, connected:true});
    io.emit('data', {from: name}, {name, connected:true});

    socket.on('data', function(data) {
      const {level,err,msg,rest}  = data;

      console.log(`data from ${name}`, data);
      io.emit(`data`, {from: name}, data);
    });

    // io.on('data', function(data) {
    //   const {level,err,msg,rest}  = data;

    //   console.log(`io.data from ${name}`, data);
    //   io.emit(`data`, {from: name}, data);
    // });

    socket.on('disconnect', function(){
      console.log(`disconnection from ${name}`, {name, connected:false});
      io.emit('data', {from: name}, {name, connected:false});
    });
  });

  server.listen(port, () => {
    console.log(`Server listening on ${port}`);
  });
}


