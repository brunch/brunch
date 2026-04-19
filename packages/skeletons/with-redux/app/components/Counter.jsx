import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

const BaseCounter = ({ count, onPlusClick, onMinusClick }) => (
  <div>
    <h5><a href="https://redux.js.org/">Redux</a> &amp; <a href="https://facebook.github.io/react/">React</a> Counter</h5>
    <p>
      <button onClick={onMinusClick}>-</button>
      {count}
      <button onClick={onPlusClick}>+</button>
    </p>
  </div>
);

BaseCounter.propTypes = {
  count: PropTypes.number.isRequired,
  onPlusClick: PropTypes.func.isRequired,
  onMinusClick: PropTypes.func.isRequired,
};

const mapStateToProps = state => ({ count: state });

const mapDispatchToProps = dispatch => ({
  onPlusClick: () => dispatch({ type: 'INCREMENT' }),
  onMinusClick: () => dispatch({ type: 'DECREMENT' }),
});

export default connect(mapStateToProps, mapDispatchToProps)(BaseCounter);
