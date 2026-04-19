'use strict';

const Component = require('inferno-component');
const {filterItems} = require('./utils');

// Skeleton's table cell component
const Skeleton = ({url, title, alias = '-', technologies, description}) => (
  <tr>
    <td><a href={`https://github.com/${url}`} target="_blank">{title}</a></td>
    <td><code>{url}</code></td>
    <td><code>{alias}</code></td>
    <td>{technologies}</td>
    <td dangerouslySetInnerHTML={{__html: description}} />
  </tr>
);


class Body extends Component {
  constructor() {
    super();
    this.state = {
      skeletons: [],
      search: '',
    };
  }

  componentWillMount() {
    fetch('https://raw.githubusercontent.com/brunch/skeletons/master/skeletons.json')
      .then(res => res.json())
      .then(({skeletons}) => this.setState({skeletons}));
  }

  handleKeyUp(e) {
    this.setState({search: e.target.value});
  }

  get filteredSkeletons() {
    const {skeletons, search} = this.state;
    return filterItems(skeletons, search, [
      'name', 'url', 'alias', 'technologies', 'description',
    ]);
  }

  render() {
    return (
      <div>
        <input
          placeholder="Type to search... It could be a technology name or anything, really"
          type="text"
          className="searchbox"
          onKeyUp={this.handleKeyUp.bind(this)}
        />
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>URL</th>
              <th>Alias</th>
              <th>Technologies</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {this.filteredSkeletons.map((skeleton, key) => (
              <Skeleton key={key} {...skeleton} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }
};

module.exports = Body;
