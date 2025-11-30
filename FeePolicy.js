// FeePolicy.js
class FeePolicy {
  calculate(days) { return 0; }
}

class SimpleLateFeePolicy extends FeePolicy {
  calculate(days) {
    return days > 14 ? (days - 14) * 0.5 : 0;
  }
}
