import { createContext, useContext, useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';

const SiteContext = createContext();

export function SiteProvider({ children }) {
  const [siteSettings, setSiteSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    settingsAPI.get()
      .then(res => {
        if (res.data?.data) {
          setSiteSettings(res.data.data);
        }
      })
      .catch(err => {
        console.error('Failed to fetch site settings', err);
      })
      .finally(() => {
        setLoadingSettings(false);
      });
  }, []);

  return (
    <SiteContext.Provider value={{ siteSettings, loadingSettings }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteContext);
}
