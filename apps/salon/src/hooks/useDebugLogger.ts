import { useEffect, useRef } from 'react';

const isDev = import.meta.env.DEV;

type DebuggableProps = Record<string, unknown>

export const useDebugLogger = (componentName: string, props: unknown) => {
  if (!isDev) {
    return 0;
  }

  const safeProps: DebuggableProps = props && typeof props === 'object'
    ? (props as DebuggableProps)
    : {}

  const prevProps = useRef<DebuggableProps>(safeProps);
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current++;
    
    const changedProps = Object.entries(safeProps).reduce<Record<string, { previous: unknown; current: unknown }>>(
      (changes, [key, value]) => {
        if (prevProps.current[key] !== value) {
          changes[key] = {
            previous: prevProps.current[key],
            current: value
          };
        }
        return changes;
      },
      {}
    );

    console.log(`${componentName} render #${renderCount.current}`, {
      changedProps: Object.keys(changedProps).length > 0 ? changedProps : 'No props changed',
      allProps: safeProps,
      timestamp: new Date().toISOString()
    });

    prevProps.current = safeProps;
  });

  return renderCount.current;
};

// 🔍 Debug хук для отслеживания useEffect выполнения
export const useEffectDebugger = (effectName: string, dependencies: unknown[]) => {
  if (!isDev) {
    return;
  }

  const prevDeps = useRef(dependencies);
  const callCount = useRef(0);

  useEffect(() => {
    callCount.current++;
    
    const changedDeps = dependencies.map((dep, index) => {
      if (prevDeps.current[index] !== dep) {
        return {
          index,
          previous: prevDeps.current[index],
          current: dep
        };
      }
      return null;
    }).filter(Boolean);

    console.log(`useEffect "${effectName}" call #${callCount.current}`, {
      changedDependencies: changedDeps.length > 0 ? changedDeps : 'No dependencies changed',
      allDependencies: dependencies,
      timestamp: new Date().toISOString()
    });

    prevDeps.current = dependencies;
  }, dependencies);
};

// 🔍 Debug хук для отслеживания состояния
export const useStateDebugger = (stateName: string, state: unknown) => {
  if (!isDev) {
    return;
  }

  const prevState = useRef(state);
  
  useEffect(() => {
    if (prevState.current !== state) {
      console.log(`State "${stateName}" changed:`, {
        previous: prevState.current,
        current: state,
        timestamp: new Date().toISOString()
      });
      prevState.current = state;
    }
  }, [stateName, state]);
};
