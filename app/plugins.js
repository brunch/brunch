'use strict';

const Component = require('inferno-component');
const {filterItems, compare} = require('./utils');

// Category and subcategory component
const Category = ({sub = false, name}) => (
  <tr>
    <td colSpan={2}>
      {sub ? <h5>{name}</h5> : <h4>{name}</h4>}
    </td>
  </tr>
);

// Plugin's table cell component
const Plugin = ({url, name, description}) => (
  <tr>
    <td>
      <a href={url ? `https://github.com/${url}` : null} target="_blank">
        {name}
      </a>
    </td>
    <td dangerouslySetInnerHTML={{__html: description}} />
  </tr>
);

// Featured plugin's list item component
const FeaturedPlugin = ({url, name, description}) => (
  <li>
    <a href={url ? `https://github.com/${url}` : null} target="_blank">
      {name}
    </a>
    {' — '}
    <span dangerouslySetInnerHTML={{__html: description}} />
  </li>
);


class Body extends Component {
  constructor() {
    super();
    this.state = {
      plugins: [],
      search: '',
    };
  }

  componentWillMount() {
    fetch('/plugins.json')
      .then(res => res.json())
      .then(({plugins}) => this.setState({plugins}));
  }

  handleKeyUp(e) {
    this.setState({search: e.target.value});
  }

  get filteredPlugins() {
    const {plugins, search} = this.state;
    return filterItems(plugins, search, [
      'name', 'url', 'category', 'subcategory', 'description',
    ]);
  }

  groupedPlugins() {
    // FIXME: Simplify that shit. Defenitely it might be implemented easier
    const groupedObj = this.filteredPlugins.reduce((memo, plugin) => {
      const {category, subcategory} = plugin;

      if (!(category in memo)) memo[category] = {};
      if (!(subcategory in memo[category])) memo[category][subcategory] = [];

      memo[category][subcategory].push(plugin);
      return memo;
    }, {});

    return Object.keys(groupedObj).map(category => {
      return {
        category,
        subcategories: Object.keys(groupedObj[category]).map(subcategory => ({
          subcategory,
          plugins: groupedObj[category][subcategory],
        })),
      };
    });
  }

  get categorySortedPlugins() {
    const sorting = [
      'Compilers', 'Minifiers', 'Linters', 'Graphics', 'Others',
    ];

    return this.groupedPlugins()
      .sort(compare(sorting, 'category'));
  }

  renderFeatured() {
    const {plugins} = this.state;

    const featuredPlugins = plugins
      .filter(plug => plug.featured)
      .map((plugin, i) => (
        <FeaturedPlugin key={i} {...plugin} />
      ));

    return this.state.search.length > 0 ? null : (
      <div>
        <h3>Here are some plugins to get you started:</h3>
        <ul>{featuredPlugins}</ul>
      </div>
    );
  }

  render() {
    // FIXME: Simplify this map in map in map. Too complex.
    const pluginItems = this.categorySortedPlugins.map(({category, subcategories}) => {
      const catItem = (
        <Category key={category} name={category} />
      );

      const subcatItems = subcategories.map(({subcategory, plugins}) => {
        const subcatItem = (
          <Category sub key={category} name={subcategory} />
        );

        const pluginItems = plugins.map((plugin, i) => (
          <Plugin key={i} {...plugin} />
        ));

        // FIXME: subcategory is a string
        return subcategory === 'undefined' ?
          pluginItems :
          [subcatItem, ...pluginItems];
      });

      return [catItem, ...subcatItems];
    });

    return (
      <div>
        <input
          placeholder="Type to search..."
          type="text"
          className="searchbox"
          onKeyUp={this.handleKeyUp.bind(this)}
        />
        {this.renderFeatured()}
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {pluginItems}
          </tbody>
        </table>
      </div>
    );
  }
};

module.exports = Body;
