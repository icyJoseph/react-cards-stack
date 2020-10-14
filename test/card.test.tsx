import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { CardStack } from '../src';

describe('it', () => {
  it('renders without crashing', () => {
    const div = document.createElement('div');
    ReactDOM.render(<CardStack images={['a', 'b']} />, div);
    ReactDOM.unmountComponentAtNode(div);
  });
});
