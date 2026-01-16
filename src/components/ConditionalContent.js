import styled from 'styled-components';

export const VisibleOnly = styled.span`
  ${p => {
    if (p.min && p.max) {
      return `
        @media (min-width: ${p.min}px) and (max-width: ${p.min}px) {
          display: none;
        }
      `;
    } else if (p.min) {
      return `
        @media (min-width: ${p.min}px) {
          display: none;
        }
      `;
    } else if (p.max) {
      return `
        @media (max-width: ${p.max}px) {
          display: none;
        }
      `;
    }
  }}
`;

export const HiddenOnly = styled.span`
  ${p => {
    if (p.min && p.max) {
      return `
        @media (min-width: ${p.min}px) and (max-width: ${p.min}px) {
          display: none;
        }
      `;
    } else if (p.min) {
      return `
        @media (min-width: ${p.min}px) {
          display: none;
        }
      `;
    } else if (p.max) {
      return `
        @media (max-width: ${p.max}px) {
          display: none;
        }
      `;
    }
  }}
`;