import styled from 'styled-components';

export const Tabs = styled.div`
  align-items: flex-end;
  display: flex;
  flex-direction: row;
  height: 100%;
  justify-content: center;
`;

export const Tab = styled.div`
  border-bottom: 2px solid ${p => p.selected ? p.theme.colors.main : 'white'};
  cursor: ${p => p.selected ? p.theme.cursors.default : p.theme.cursors.active};
  font-size: 16px;
  font-weight: bold;
  margin: 0 8px;
  opacity: ${p => p.selected ? 1 : 0.4};
  padding: 8px;
  ${p => p.selectable ? '' : 'pointer-events: none;'}
  text-align: center;
  text-transform: uppercase;
  transition: opacity 100ms ease;
  width: 150px;
  &:hover {
    opacity: ${p => p.selected ? 1 : 0.75};
  }
`;