import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?:
    | React.ReactNode
    | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  timestamp: number | null;
}

/**
 * 全局错误边界：捕捉渲染/生命周期/子组件抛出的同步错误。
 * 支持：
 *  - 自定义 fallback（节点或函数）
 *  - reset 机制（路由变化或显式调用）
 *  - 轻量错误上报钩子 onError
 */
export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    timestamp: null
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error, timestamp: Date.now() };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (this.props.onError) this.props.onError(error, info);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, timestamp: null });
  };

  renderFallback() {
    const { fallback } = this.props;
    const { error } = this.state;
    if (!fallback) {
      return (
        <div style={styles.wrapper}>
          <div style={styles.card}>
            <h2 style={styles.title}>界面出现异常</h2>
            <p style={styles.msg}>{error?.message || 'Unknown Error'}</p>
            <div style={styles.actions}>
              <button style={styles.button} onClick={this.reset}>
                重试
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (typeof fallback === 'function')
      return fallback(error as Error, this.reset);
    return fallback;
  }

  render() {
    if (this.state.hasError) return this.renderFallback();
    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), rgba(0,0,0,0.6))',
    backdropFilter: 'blur(12px) saturate(160%)',
    WebkitBackdropFilter: 'blur(12px) saturate(160%)',
    padding: 24
  },
  card: {
    maxWidth: 420,
    width: '100%',
    borderRadius: 16,
    background: 'rgba(20,20,28,0.55)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.12)',
    padding: '28px 32px',
    color: '#fff',
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Cantarell'
  },
  title: {
    margin: '0 0 12px',
    fontSize: 22,
    letterSpacing: 0.5,
    fontWeight: 600,
    background: 'linear-gradient(120deg,#82f,#5ef)',
    WebkitBackgroundClip: 'text',
    color: 'transparent'
  },
  msg: {
    opacity: 0.85,
    lineHeight: 1.5,
    fontSize: 14,
    margin: '0 0 20px'
  },
  actions: {
    display: 'flex',
    gap: 12
  },
  button: {
    flexShrink: 0,
    padding: '8px 18px',
    fontSize: 14,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 500,
    letterSpacing: 0.5,
    transition: 'all .25s ease'
  }
};
