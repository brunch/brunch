var sys = require('sys'),
i, colors = exports.colors = {},
format = function(color) {
    return "\033[" + colors.fg[color] + "m";
},
formatbg = function(color) {
    return "\033[" + colors.bg[color] + "m";
};

colors.fg = {
    black: '30',
    dgray: '1;30',
    red: '31',
    lred: '1;31',
    green: '32',
    lgreen: '1;32',
    brown: '33',
    yellow: '1;33',
    blue: '34',
    lblue: '1;34',
    purple: '35',
    lpurple: '1;35',
    cyan: '36',
    lcyan: '1;36',
    lgray: '37',
    white: '1;37',
    none: ''
};
colors.bg = {
    darkgray: 40,
    red: 41,
    green: 42,
    yellow: 43,
    lblue: 44,
    purple: 45,
    lcyan: 46,
    lgray: 47
};


for (i in colors.fg) {
    colors[i] = (function(color) {
        return function(str, n) {
            str = str || '';
            n = (n) ? format('none') : '';
            return format(color) +  str + n;
        }
    })(i);
}

for (i in colors.bg) {
    colors['bg_' + i] = (function(color) {
        return function(str) {
            return formatbg(color) + str + format('none');
        }
    })(i);
}


colors.bold = function(str) {
    return "\033[1m" + str + "\033[0m"
};