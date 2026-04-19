'use strict';
const Plugin = require('./index');
const fs = require('fs');
const should = require('should');
const Mocha = require('mocha');

describe('Tests', () => {
   const blankOpts = { reporter: function(){} }; // no output
   it('should fail', done => {
      const failingTest = new Mocha.Test('failing Test', () => {
         const data = fs.readFileSync('fixtures/sample.css', 'utf-8');
         const expected = "this is actually not expected";
         return plugin.process({data}).then(actual => {
            actual.data.should.eql(expected);
         });
      });
      const mocha = new Mocha(blankOpts);
      mocha.suite.addTest(failingTest);
      mocha.run(failures => {
         failures.should.equal(1);
         done();
      })
   });
});


describe('Plugin', () => {
  let plugin, config;

  beforeEach(() => {
    config = {
      paths: {root: '.'},
      plugins: {
        postcss: {
          processors: [
            require('autoprefixer')({browsers: 'last 99 versions'}),
            require('css-mqpacker'),
            require('csswring')
          ],
          ignore: [
            "postcssignore.css"
          ]
        }
      }
    };
    plugin = new Plugin(config);
  });

  it('should be an object', () => {
    plugin.should.be.an.Object;
  });

  // it('uses processors', () => {
  //   plugin.processors.should.be.an.Array().with.length(3);
  // });

  it('compile', () => {
    const data = 'a{a:a}';
    return plugin.compile({path: 'a.css', data}).then(file => {
      file.data.should.be.eql(data);
    });
  });

  it('compile with options', () => {
     const data = fs.readFileSync('fixtures/sample.css', 'utf-8');
     const expected = fs.readFileSync('fixtures/sample.out.css', 'utf-8');
     return plugin.compile({path: 'a.css', data}).then(actual => {
       actual.data.should.eql(expected);
     });
  });

  it('compile with sourcemaps', () => {
    const data = fs.readFileSync('fixtures/sample.css', 'utf-8');
    const map = {
      version: 3,
      sources: [ 'fixtures/sample.css' ],
      names: [],
      mappings: 'AAKA,QACE,mBAAa,CAAb,oBAAa,CAAb,gBAAa,CAAb,mBAAa,CAAb,YACF,CAPA,cACE,GACE,UACF,CAMA,GACE,UACF,CAPF',
      file: 'sample.css'
    };
    return plugin.compile({data, path: 'fixtures/sample.css'}).then(file => {
      JSON.parse(file.map).should.eql(map);
    });
  });

  it('compile when no data given', () => {
    const expected = '';
    return plugin.compile({path: 'a.css'}).then(actual => {
      actual.data.should.eql(expected);
    });
  });

  it('compile ignored file', () => {
    const expected = 'h2 { color: red; }';
    return plugin.compile({path: 'postcssignore.css', data: 'h2 { color: red; }'}).then(actual => {
      actual.data.should.eql(expected);
    });
  });

  it('compile with custom parser', () => {
    const data = fs.readFileSync('fixtures/parser.scss', 'utf-8');
    const expected = fs.readFileSync('fixtures/parser.out.scss', 'utf-8');

    const scssPlugin = new Plugin({
      paths: {root: '.'},
      plugins: {
        postcss: {
          options: {
            parser: require('postcss-scss'),
          },
        },
      },
    });

    return scssPlugin.compile({data, path: 'fixtures/parser.scss'}).then(actual => {
      actual.data.should.be.equal(expected);
    });
  })
});
