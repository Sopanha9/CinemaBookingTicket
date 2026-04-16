import { Component } from "react";
import { Button } from "../ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/Card";

const isDev = import.meta.env.DEV;

export default class LayoutErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Keep details in the console for debugging while preserving a friendly UI.
    console.error("Layout render error", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-base-100 px-4">
        <Card className="w-full max-w-xl border-error/40">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              {isDev
                ? this.state.error?.message || "Unexpected runtime error"
                : "An unexpected error occurred while rendering this page."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={this.handleReset}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}
