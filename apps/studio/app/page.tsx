'use client';

import { FlexkitStudio } from '@flexkit/studio';

export default function Page(): JSX.Element {
  // const appDispatch = useAppDispatch();

  // TODO: find a better way to set the title and breadcrumbs.
  // useEffect(() => {
  //   appDispatch({ type: 'IS_ROUTE_LOADING', payload: false });
  //   appDispatch({ type: 'SET_TITLE', payload: 'Dashboard' });
  //   appDispatch({ type: 'SET_BREADCRUMBS', payload: [{ label: 'Dashboard' }] });
  // }, [appDispatch]);

  return <FlexkitStudio />;
}
