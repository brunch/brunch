require 'rexml/document'

cfg = open('config.xml').read
config = REXML::Document.new cfg

def command?(name)
  `which #{name}`
  $?.success?
end

def bootstrap(config)
  pkg = config.root.attributes[:id]
  name = config.root.children.find { |c| c.name rescue false }.children[0]
  unless command? "cordova"
    system "npm install -g cordova@6.0.0"
  end
  system "cordova create cordova #{pkg} '#{name}'"
  system "cp config.xml cordova/config.xml"
end

def build(command, platform)
  unless Dir.exists?("cordova/#{platform}")
    system "cd cordova && cordova platform add #{platform}"
  end
  case command
  when 'build'
    system "cd cordova && cordova build #{platform}"
  when 'run'
    system "cd cordova && cordova run #{platform} --device"
  when 'emulate'
    system "cd cordova && cordova emulate #{platform}"
  end
end

case command = ARGV.shift || 'init'
when 'init'
  bootstrap config
when 'run', 'emulate', 'build'
  platform = ARGV.shift
  build command, platform
when 'reset'
  system "rm -rf cordova"
else
  puts "Unrecognized command: #{command}"
end
