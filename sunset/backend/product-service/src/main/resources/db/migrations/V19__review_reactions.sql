ALTER TABLE product_review_helpful_votes
    ADD COLUMN vote VARCHAR(7) NOT NULL DEFAULT 'LIKE';

ALTER TABLE product_review_helpful_votes
    ADD CONSTRAINT product_review_vote_type CHECK (vote IN ('LIKE', 'DISLIKE'));
