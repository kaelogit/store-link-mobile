import * as React from 'react';
import renderer from 'react-test-renderer';

// 🏛️ Sovereign Components
import { MonoText } from '../StyledText';

/**
 * 🧪 COMPONENT TEST: MonoText
 * Validates the rendering protocol for themed fixed-width text.
 */
it('renders the monospace text component correctly', () => {
  const tree = renderer.create(<MonoText>Snapshot test!</MonoText>).toJSON();

  expect(tree).toMatchSnapshot();
});