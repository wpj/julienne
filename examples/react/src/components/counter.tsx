import React, { useEffect, useState } from 'react';
import cc from 'classcat';

import * as styles from './counter.module.css';

export default function Button(): JSX.Element {
  let [count, setCount] = useState(0);
  let isEven = count % 2 === 0;

  useEffect(() => {
    let interval = setInterval(() => {
      setCount((c) => c + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  let cls = cc([styles.root, isEven ? styles.even : styles.odd]);

  return <div className={cls}>{count}</div>;
}
