import "./ProductCardSkeleton.css";

export default function ProductCardSkeleton({ count = 4 }) {
  return Array.from({ length: count }, (_, index) => <div className="product-card-skeleton" aria-hidden="true" key={index} />);
}
