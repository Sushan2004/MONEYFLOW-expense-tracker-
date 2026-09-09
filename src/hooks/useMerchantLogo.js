import { useEffect, useState } from 'react';
import {
  buildMerchantLogoUrl,
  getCachedMerchantLogo,
  hasLogoDevApiKey,
  normalizeMerchantName,
  setCachedMerchantLogo,
} from '../utils/logoDev.js';

function getInitialState(merchantName, enabled) {
  const merchant = normalizeMerchantName(merchantName);

  if (!enabled || !merchant || !hasLogoDevApiKey()) {
    return {
      merchant,
      url: null,
      status: 'fallback',
    };
  }

  const cached = getCachedMerchantLogo(merchant);
  if (cached?.status === 'missing') {
    return {
      merchant,
      url: null,
      status: 'missing',
    };
  }

  const url = cached?.url || buildMerchantLogoUrl(merchant);
  return {
    merchant,
    url,
    status: cached?.status || 'pending',
  };
}

export default function useMerchantLogo(merchantName, { enabled = true } = {}) {
  const [state, setState] = useState(() => getInitialState(merchantName, enabled));

  useEffect(() => {
    setState(getInitialState(merchantName, enabled));
  }, [enabled, merchantName]);

  function handleLoad() {
    if (!state.merchant || !state.url) return;
    setCachedMerchantLogo(state.merchant, { status: 'ready', url: state.url });
    setState((current) => ({ ...current, status: 'ready' }));
  }

  function handleError() {
    if (!state.merchant) return;
    setCachedMerchantLogo(state.merchant, { status: 'missing', url: null });
    setState((current) => ({ ...current, status: 'missing', url: null }));
  }

  return {
    logoUrl: state.status === 'missing' ? null : state.url,
    showLogo: Boolean(state.url) && state.status !== 'missing',
    handleLoad,
    handleError,
    isFallback: !state.url || state.status === 'missing' || state.status === 'fallback',
  };
}
