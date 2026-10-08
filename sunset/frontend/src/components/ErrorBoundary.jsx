import React from "react";
import "./ErrorBoundary.css";

export default class ErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;

    const entireApp = this.props.variant === "app";
    return (
      <section className={`error-recovery ${entireApp ? "error-recovery--app" : ""}`} role="alert">
        <div className="error-recovery__card">
          <span className="error-recovery__symbol" aria-hidden="true">✦</span>
          <p className="error-recovery__eyebrow">SUNSET · НЕБОЛЬШАЯ ПАУЗА</p>
          <h1>{entireApp ? "Магазин пока не открылся" : "Не удалось открыть эту страницу"}</h1>
          <p>Ваши товары и данные не затронуты. Попробуйте ещё раз или вернитесь на главную.</p>
          <div className="error-recovery__actions">
            <button type="button" onClick={() => this.setState({ failed: false })}>Повторить</button>
            <a href="#/">На главную</a>
          </div>
        </div>
      </section>
    );
  }
}
