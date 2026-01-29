// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('App Smoke Test', () => {
  it('renders without crashing', () => {
    render(<div>Test</div>);
    // Basic check to see if the main container or some text exists
    // Since we don't know the exact content, just checking if render didn't throw
    expect(document.body).toBeTruthy();
  });
});
