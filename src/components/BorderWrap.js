import styled from 'styled-components';

export default styled.div`
  border: 1px solid #777;
  border-radius: ${p => (p.height || 80) * 0.05}px;
  height: ${p => p.height || 80}px;
  margin: ${p => (p.height || 80) * 0.1}px;
  outline: ${p => (p.height || 80) * 0.1}px solid #222;
  overflow: hidden;
`;