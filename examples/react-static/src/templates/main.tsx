import React from 'react';
import { Helmet } from 'react-helmet';

import Counter from '../components/counter';

import '@fontsource/open-sans';

export default function Main(): JSX.Element {
  return (
    <>
      <Helmet>
        <title>Main</title>
      </Helmet>
      <Counter />
    </>
  );
}
