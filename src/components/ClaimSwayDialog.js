import styled from 'styled-components';

import Dialog from '~/components/Dialog';

const Container = styled.div`
  max-width: 90vw;
  padding: 25px 40px;
  width: 500px;
  & h3 {
    margin: 0 0 10px;
  }
  & > p {
    margin: 0;
    font-size: 85%;
    line-height: 1.25em;
  }
`;

const CrewmateList = styled.div`
  margin: 20px -16px 0;
  & > div {
    align-items: center;
    background-color: #111;
    display: flex;
    flex-direction: row;
    padding: 8px 16px;
    transition: background-color 200ms ease;
    &:nth-child(odd) {
      background-color: #1a1a1a;
    }
    &:hover {
      background-color: #272727;
    }

    & > div:first-child {
      flex: 1;
      font-size: 85%;
      padding-right: 12px;
      & > label {
        display: block;
        font-weight: bold;
      }
    }
  }
`;

const ClaimSwayDialog = ({ assetType, unreadyAssets, onClose }) => {
  return (
    <Dialog onClose={onClose}>
      <Container>
        <h3>
          {`Oops! Some ${assetType === 'asteroids' ? 'asteroids' : 'crewmates'} are not ready.`}
        </h3>
        <p>
          SWAY claims were included as part of crewmate assignments for Arvad crewmates
          and the associated asteroids. You must claim this SWAY on L1 before you can
          bridge to L2.
        </p>

        <CrewmateList>
          {unreadyAssets.map((asset) => (
            <div key={`${asset.id}`}>
              <div>
                <label>
                  {asset.Name?.name || `${assetType === 'asteroids' ? 'Asteroid' : 'Crewmate'} #${asset.id}`}
                </label>
              </div>
            </div>
          ))}
        </CrewmateList>
      </Container>
    </Dialog>
  );
};

export default ClaimSwayDialog;