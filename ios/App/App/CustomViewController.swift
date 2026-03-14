import Capacitor
import WebKit

class CustomViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // Disable WebView scroll bounce to prevent body from scrolling
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.alwaysBounceHorizontal = false
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
    }
}
