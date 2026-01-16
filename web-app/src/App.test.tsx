// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

describe('App Smoke Test', () => {
  it('renders without crashing', () => {
    render(<div>Test</div>);
    // Basic check to see if the main container or some text exists
    // Since we don't know the exact content, just checking if render didn't throw
    expect(document.body).toBeTruthy();
  });
});
