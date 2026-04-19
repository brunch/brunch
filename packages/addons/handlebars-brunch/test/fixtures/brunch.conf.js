exports.runtimeTrue = {
  plugins: {
    handlebars: {
      include: {
        runtime: true
      }
    }
  }
};

exports.runtimeFalse = {
  plugins: {
    handlebars: {
      include: {
        runtime: false
      }
    }
  }
};

exports.runtimeFalseOptimizedTrue = {
  plugins: {
    handlebars: {
      include: {
        runtime: false
      }
    }
  },
  optimize: true
};

exports.runtimeTrueAmdTrue = {
  plugins: {
    handlebars: {
      include: {
        runtime: true,
        amd: true
      }
    }
  }
};

exports.runtimeTrueOptimizeTrue = {
  plugins: {
    handlebars: {
      include: {
        runtime: true
      }
    }
  },
  optimize: true
};

exports.runtimeTrueAmdTrueOptimizeTrue = {
  plugins: {
    handlebars: {
      include: {
        runtime: true,
        amd: true
      }
    }
  },
  optimize: true
};

exports.runtimeTrueAmdTrue = {
  plugins: {
    handlebars: {
      include: {
        runtime: true,
        amd: true
      }
    }
  }
};

exports.amdTrue = {
  plugins: {
    handlebars: {
      include: {
        amd: true,
        runtime: false
      }
    }
  }
};

exports.amdTrueOptimizeTrue = {
  plugins: {
    handlebars: {
      include: {
        amd: true,
        runtime: false
      }
    }
  },
  optimize: true
};

exports.amdFalse = {
  plugins: {
    handlebars: {
      include: {
        amd: false,
        runtime: false
      }
    }
  }
};

exports.globalNamespaceString = {
  plugins: {
    handlebars: {
      namespace: 'JST.Sub'
    }
  }
};

exports.globalNamespaceFunction = {
  plugins: {
    handlebars: {
      namespace: filePath => 'test_templates'
    }
  }
};

exports.compileStaticWitData = {
  plugins: {
    handlebars: {
      locals: {
        title: 'Brunch is awesome!'
      }
    }
  }
};