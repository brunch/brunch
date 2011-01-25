# -*- encoding: utf-8 -*-
$:.push File.expand_path("../lib", __FILE__)
require "brunch/version"

Gem::Specification.new do |s|
  s.name        = "brunch"
  s.version     = Brunch::VERSION
  s.platform    = Gem::Platform::RUBY
  s.authors     = ['Jan Monschke', 'Martin Schuerrer', 'Nikolaus Graf', 'Allan Berger', 'Thomas Schranz']
  # s.email       = 'info@brunch.com' ?
  s.homepage    = 'http://brunchwithcoffee.org/'
  s.summary     = %q{TODO: Write a gem summary}
  s.description = %q{TODO: Write a gem description}

  s.rubyforge_project = "brunch"

  s.files         = `git ls-files`.split("\n")
  s.test_files    = `git ls-files -- {test,spec,features}/*`.split("\n")
  s.executables   = `git ls-files -- bin/*`.split("\n").map{ |f| File.basename(f) }
  s.require_paths = ["lib"]
end
