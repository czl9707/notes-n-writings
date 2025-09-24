---
tags: [machine-learning]
title: Clustering
created-date: 2025-08-03T00:00:00-04:00
last-updated-date: 2025-09-22T23:14:03-04:00
---

## K-Means

K-Means is an algorithm cluster given sample data into k groups, and all sample will end up in some cluster. The algorithm initialize k center node randomly. For each iteration:

- For each sample, we find the nearest center node.
- For each group, we calculate the center node again using all samples.
- Repeat until group member converge.
- If a group loss all member, we drop it, may or may not re-initialize it randomly.

K-Means' performance decrease drastically when feature dimension goes high, or k goes high, [PCA](note/by/developer/principle_component_analysis.md) and other dimension reduction methods are common remediations. And K-Means also makes the assumption that the cluster is round shaped, which leads to problem in many case.

## DBSCAN

**DBSCAN** stands for "Density-Based Spatial Clustering of Applications with Noise". As its name, it groups samples based on the density respecting parameter `eps`. And any sample not able to join a cluster with more than `minPts` sample, will be classify as noise. With DBSCAN, we do not have direct control over cluster number, and will have sample belongs to no cluster.

## Agglomerative

Agglomerative Hierarchical Clustering starts with putting each sample into its own cluster. And repeatedly merge closest cluster until reaching desired number of cluster. The merging history shows the hierarchy (called a **dendrogram**).

There are multiple different way of measuring distance between clusters:

- Complete: The farthest distance between individual members.
- Single: The closest distance between individual members.
- Centroid: Distance between the centroid of each clusters.
- Average: The average distance between individual members.
- Ward: Distance between special points, which minimize the cluster variance.

## Measure: Silhouette Score

The **silhouette score** is a metric used to evaluate the quality of a clustering result, regardless of clustering method.

- $a(i)$ : average distance to all other points in the same cluster.
- $b(i)$ : lowest average distance to points in any other cluster.
- silhouette score:
  $$s(i) = \frac{b(i) - a(i)}{\max(b(i), a(i))}$$