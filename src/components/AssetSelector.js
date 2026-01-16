import { useCallback, useMemo } from 'react';
import PuffLoader from 'react-spinners/PuffLoader';
import styled from 'styled-components';
import { RiRefreshLine as RefreshIcon } from 'react-icons/ri';
import { Asteroid } from '@influenceth/sdk';

import silhouette from '~/assets/images/silhouette.png';
import AssetCard from '~/components/AssetCard';
import useStore from '~/hooks/useStore';
import { WarningIcon } from './Icons';
import { Tab, Tabs } from './Tabs';
import { assetMappings } from '~/lib/assets';

const highlightColor = 'white';
const unselectedColor = '#206378';

const Checkbox = styled.div`
  background: ${p => p.checked ? p.theme.colors.main : (p.unselectedColor || unselectedColor)};
  border-radius: 2px;
  cursor: ${p => p.theme.cursors.active};
  display: inline-block;
  height: 1.4em;
  outline: solid rgba(255,255,255,0.9);
  outline-width: 0;
  position: relative;
  text-align: center;
  transition: outline 100ms linear;
  width: 1.4em;
  vertical-align: middle;
  &:after {
    content: '✔';
    color: ${p => p.checked ? 'white' : 'transparent'};
    vertical-align: middle;
  }
  &:hover {
    outline-width: 1.5px;
  }
`;

const SelectAll = styled.div`
  color: #CCC;
  cursor: ${p => p.theme.cursors.active};
  font-size: 85%;
  position: absolute;
  left: 20px;
  bottom: 10px;
  transition: color 100ms linear;

  white-space: nowrap;
  & ${Checkbox} {
    margin-right: 6px;
  }
  & > span {
    display: inline-block;
    vertical-align: middle;
  }
  &:hover {
    color: #fff;
    & ${Checkbox} {
      outline-width: 1.5px;
    }
  }

  @media (max-width: 600px) {
    width: auto;
  }
`;

const TypeSelection = styled.div`
  color: white;
  padding-top: 25px;
  position: relative;
  @media (max-width: 580px) {
    padding-top: 5px;
    padding-bottom: 45px;
  }
`;

const RefreshLink = styled.div`
  cursor: ${p => p.theme.cursors.active};
  font-size: 32px;
  opacity: 0.15;
  line-height: 1em;
  position: absolute;
  right: 20px;
  bottom: 0;
  transition: opacity 200ms ease;
  &:hover {
    opacity: 0.4;
  }
  & > span {
    display: inline-block;
  }
`;

const SelectionContainer = styled.div`
  display: grid;
  grid-column-gap: 16px;
  grid-row-gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  overflow-y: auto;
  padding: 16px 12px;

  @media (max-width: 540px) {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
`;

const EmptyMessage = styled.div`
  margin: 0 auto;
  padding: 40px;
`;

const CardCheckbox = styled.div`
  position: absolute;
  background: black;
  top: -12px;
  right: -12px;
  padding: 0 2px;
`;

const SelectableAsset = styled.div`
  background-color: transparent;
  border: 4px solid black;
  outline: 2px solid;
  outline-color: ${p => p.selected ? '#14496f' : 'transparent'};
  border-radius: 6px;
  padding: 20px 20px 10px;
  position: relative;
  transition: border-color 100ms ease, background-color 200ms ease;

  @media (max-width: 540px) {
    padding: 12px 12px 6px;
  }

  & ${CardCheckbox} > * {
    opacity: ${p => p.selected ? 1 : 0};
    transition: opacity 100ms ease;
  }

  ${p => p.disabled
    ? `
      opacity: ${p.selected ? 1 : 0.4};
      outline-color: transparent;
      & ${CardCheckbox} > * {
        opacity: 0;
      }
    `
    : `
      cursor: ${p.theme.cursors.active};
      &:hover {
        background-color: #0a1c23;
        outline-color: ${p.selected ? p.theme.colors.main : 'transparent'};
        & ${CardCheckbox} > * {
          opacity: 1;
        }
      }
    `
  }
`;

const CardDetails = styled.div`
  font-size: 75%;
  font-weight: bold;
  min-height: 30px;

  & > div:first-child {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin: 8px 0 2px;

    & > span:first-child {
      color: ${highlightColor};
      overflow: hidden;
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    & > span:nth-child(2) {
      color: ${p => p.theme.colors.error};
      padding-left: 4px;
    }
  }
`;

const AttentionIcon = styled.div`
  color: #ff7000;
  font-size: 25px;
  line-height: 0;
  position: absolute;
  right: 20px;
  bottom: 13px;
`;

const noop = () => {/* no-op */};

const AssetSelector = ({
  assets,
  disabled,
  isDisabledAsset,
  maxSelectable,
  onReloadAssets,
  onBeforeSelect,
  onBeforeSelectAll,
  reloadingAssets
}) => {
  const assetTab = useStore(s => s.assetTab);
  const mode = useStore(s => s.mode);

  const dispatchAssetSelected = useStore(s => s.dispatchAssetSelected);
  const dispatchAssetSelectedAll = useStore(s => s.dispatchAssetSelectedAll);
  const dispatchAssetTabSelected = useStore(s => s.dispatchAssetTabSelected);

  const selected = useMemo(() => assets.filter((a) => a._selected), [assets]);
  const allSelected = useMemo(() => {
    const nonDisabledAssets = assets.reduce((acc, cur) => acc + (isDisabledAsset(cur) ? 0 : 1), 0);
    return selected.length >= Math.min(maxSelectable, nonDisabledAssets);
  }, [assets, isDisabledAsset, maxSelectable, selected.length]);

  const handleSelect = useCallback((asset) => () => {
    if (!onBeforeSelect || onBeforeSelect(asset)) {
      dispatchAssetSelected(asset);
    }
  }, [onBeforeSelect, dispatchAssetSelected]);

  const handleSelectAll = useCallback(() => {
    if (!onBeforeSelectAll || onBeforeSelectAll()) {
      dispatchAssetSelectedAll(!allSelected, maxSelectable);
    }
  }, [allSelected, maxSelectable, onBeforeSelectAll, dispatchAssetSelectedAll]);

  return (
    <>
      <TypeSelection>
        {mode === 'bridge' && (
          <Tabs>
            {assetMappings['asteroids'].active && (
              <Tab
                selectable={!disabled}
                selected={assetTab === 'asteroids'}
                onClick={() => dispatchAssetTabSelected('asteroids')}>
                Asteroids
              </Tab>
            )}
            {assetMappings['crewmates'].active && (
              <Tab
                selectable={!disabled}
                selected={assetTab === 'crewmates'}
                onClick={() => dispatchAssetTabSelected('crewmates')}>
                Crewmates
              </Tab>
            )}
            {assetMappings['crews'].active && (
              <Tab
                selectable={!disabled}
                selected={assetTab === 'crews'}
                onClick={() => dispatchAssetTabSelected('crews')}>
                Crew
              </Tab>
            )}
            {assetMappings['ships'].active && (
              <Tab
                selectable={!disabled}
                selected={assetTab === 'ships'}
                onClick={() => dispatchAssetTabSelected('ships')}>
                Ships
              </Tab>
            )}
          </Tabs>
        )}
        {!disabled && (
          <>
            <SelectAll onClick={handleSelectAll}>
              <Checkbox checked={allSelected} />
              <span>
                {allSelected
                  ? 'Deselect All'
                  : (assets.length > maxSelectable
                    ? `Select Max`
                    : 'Select All'
                  )
                }
              </span>
            </SelectAll>

            <RefreshLink
              data-tip="Reload Assets"
              data-place="left"
              onClick={!reloadingAssets ? () => onReloadAssets() : noop}>
              {!reloadingAssets && <RefreshIcon />}
              {reloadingAssets && <PuffLoader color="white" size={36} />}
            </RefreshLink>
          </>
        )}
      </TypeSelection>
      {assets.length === 0 && (
        <EmptyMessage>
          No {mode === 'bridge' ? assetMappings[assetTab].plural : 'unclaimed assets'} are owned by this wallet.
        </EmptyMessage>
      )}
      {assets.length !== 0 && (
        <SelectionContainer>
          {assets.map((asset) => {
            const cardImageUrl = `${process.env.REACT_APP_IMAGES_URL}/v2/${asset._type}/${asset.id}/image.svg`;
            const fallbackImageUrl = asset._type === 'crewmates' && silhouette;
            return (
              <SelectableAsset
                key={asset.id}
                disabled={disabled || isDisabledAsset(asset)}
                onClick={handleSelect(asset)}
                highlighted={asset._selected}
                selected={asset._selected}>
                <AssetCard
                  imageUrl={cardImageUrl}
                  fallbackImageUrl={fallbackImageUrl}
                  bridgingStatus={asset._bridgingStatus || 0}
                  unclaimedSway={asset._unclaimedSway || 0} />
                {mode === 'bridge' && (asset._unclaimedSway > 0 || asset.AsteroidReward?.hasMintableCrewmate) && (
                  <AttentionIcon data-tip={asset._unclaimedSway > 0 ? 'Un-claimed SWAY' : 'Un-minted Crewmate'}>
                    <WarningIcon />
                  </AttentionIcon>
                )}
                <CardDetails>
                  <div>
                    <span>{asset.Name?.name || (asset._type === 'asteroids' ? Asteroid.Entity.getBaseName(asset) : '')}</span>
                  </div>
                  <div>
                    {assetMappings[asset._type].singular} #{asset.id}
                  </div>
                  {assetTab === 'crews' && asset.Crew?.delegatedTo && (
                    <div>
                      Delegate <span>{asset.Crew.delegatedTo.substring(0, 6)}...{asset.Crew.delegatedTo.substring(asset.Crew.delegatedTo.length - 4)}</span>
                    </div>
                  )}
                </CardDetails>
                <CardCheckbox>
                  <Checkbox checked={asset._selected} />
                </CardCheckbox>
              </SelectableAsset>
            );
          })}
        </SelectionContainer>
      )}
    </>
  );
};

export default AssetSelector;
