// Install required packages first:
// npm install @qdrant/js-client-rest axios dotenv

import { QdrantClient } from "@qdrant/js-client-rest";

class QdrantVectorDB {
  constructor() {
    // Initialize Qdrant client
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      apiKey: process.env.QDRANT_API_KEY, // Optional for cloud instances
    });
    this.vectorSize = 768;
    this.collectionName = "tweets";
  }

  // Initialize and create collection
  async initialize() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (col) => col.name === this.collectionName
      );
      if (!collectionExists) {
        // Create collection with vector configuration

        // Create collection
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize, // Adjust based on your embedding model
            distance: "Cosine", // Good for text embeddings
          },
        });

        console.log(`Collection '${this.collectionName}' created successfully`);
      } else {
        console.log(`Collection '${this.collectionName}' already exists`);
      }
    } catch (error) {
      console.error("Error initializing Qdrant:", error);
      throw error;
    }
  }

  // Insert vectors into collection
  async insertVectors(vectors) {
    try {
      const points = vectors.map((vector, index) => ({
        id: vector.id || index + 1,
        vector: vector.embedding,
        payload: vector.payload || {},
        // pagecontent: vector.pagecontent || "",
      }));

      const result = await this.client.upsert(this.collectionName, {
        wait: true,
        points: points,
      });

      console.log(`Inserted ${points.length} vectors successfully`);
      return result;
    } catch (error) {
      console.error("Error inserting vectors:", error);
      throw error;
    }
  }

  // Search for similar vectors
  async searchSimilar(queryVector, limit = 5, scoreThreshold = 0.5) {
    try {
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit: limit,
        score_threshold: scoreThreshold,
        with_payload: true,
        with_vector: false, // Set to true if you need the vectors back
      });

      return searchResult.map((result) => ({
        id: result.id,
        score: result.score,
        payload: result.payload,
      }));
    } catch (error) {
      console.error("Error searching vectors:", error);
      throw error;
    }
  }

  // Search with filters
  async searchWithFilter(queryVector, filter, limit = 5) {
    try {
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit: limit,
        filter: filter,
        with_payload: true,
      });

      return searchResult;
    } catch (error) {
      console.error("Error searching with filter:", error);
      throw error;
    }
  }

  // Get Points

  async getPoints() {
    try {
      const points = await this.client.scroll("tweets", {
        with_payload: true,
        with_vector: false,
        limit: 10000,
      });

      return points.points;
    } catch (error) {
      console.error("Error retrieving points:", error);
      throw error;
    }
  }

  // Get point by ID
  async getPoint(pointId) {
    try {
      const point = await this.client.retrieve(this.collectionName, {
        ids: [pointId],
        with_payload: true,
        with_vector: true,
      });

      return point[0] || null;
    } catch (error) {
      console.error("Error retrieving point:", error);
      throw error;
    }
  }

  // Update point payload
  async updatePayload(pointId, payload) {
    try {
      await this.client.setPayload(this.collectionName, {
        payload: payload,
        points: [pointId],
        wait: true,
      });

      console.log(`Updated payload for point ${pointId}`);
    } catch (error) {
      console.error("Error updating payload:", error);
      throw error;
    }
  }

  // Delete points
  async deletePoints(pointIds) {
    try {
      await this.client.delete(this.collectionName, {
        points: pointIds,
        wait: true,
      });

      console.log(`Deleted ${pointIds.length} points`);
    } catch (error) {
      console.error("Error deleting points:", error);
      throw error;
    }
  }

  // Get collection info
  async getCollectionInfo() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return info;
    } catch (error) {
      console.error("Error getting collection info:", error);
      throw error;
    }
  }

  // Create index for faster filtering
  async createIndex(fieldName, fieldType = "keyword") {
    try {
      await this.client.createFieldIndex(this.collectionName, {
        field_name: fieldName,
        field_type: fieldType,
        wait: true,
      });

      console.log(`Created index for field: ${fieldName}`);
    } catch (error) {
      console.error("Error creating index:", error);
      throw error;
    }
  }

  async deletecollection() {
    await this.client.deleteCollection(this.collectionName);
  }

  async pointexist(pointId) {
    try {
      const result = await this.client.retrieve(this.collectionName, {
        ids: [pointId],
        with_payload: true,
        with_vector: false,
      });

      return result.length > 0;
    } catch (error) {
      console.error("Error retrieving point:", error);
      return null;
    }
  }
}
export { QdrantVectorDB };
