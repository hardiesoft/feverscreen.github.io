const DBScan = ({ dataset, epsilon, epsilonCompare, minimumPoints, distanceFunction }) => {
    epsilon = epsilon || 1; // aka maxDistance
    epsilonCompare =
        epsilonCompare || ((dist, e) => dist < e);
    minimumPoints = minimumPoints || 2;
    distanceFunction =
        distanceFunction || ((a, b) => Math.abs(a - b));
    const visitedIndices = {};
    const isVisited = (i) => visitedIndices[i], markVisited = (i) => {
        visitedIndices[i] = true;
    };
    const clusteredIndices = {};
    const isClustered = (i) => clusteredIndices[i], markClustered = (i) => {
        clusteredIndices[i] = true;
    };
    const uniqueMerge = (targetArray, sourceArray) => {
        for (let i = 0; i < sourceArray.length; i += 1) {
            const item = sourceArray[i];
            if (targetArray.indexOf(item) < 0) {
                targetArray.push(item);
            }
        }
    };
    const findNeighbors = (index) => {
        const neighbors = [];
        for (let other = 0; other < dataset.length; other += 1) {
            const distance = distanceFunction(dataset[index], dataset[other]);
            if (epsilonCompare(distance, epsilon)) {
                neighbors.push(other);
            }
        }
        return neighbors;
    };
    const noise = [], addNoise = (i) => noise.push(i);
    const clusters = [], createCluster = () => clusters.push([]) - 1, addIndexToCluster = (c, i) => {
        clusters[c].push(i);
        markClustered(i);
    };
    const expandCluster = (c, neighbors) => {
        for (let i = 0; i < neighbors.length; i += 1) {
            const neighborIndex = neighbors[i];
            if (!isVisited(neighborIndex)) {
                markVisited(neighborIndex);
                const secondaryNeighbors = findNeighbors(neighborIndex);
                if (secondaryNeighbors.length >= minimumPoints) {
                    uniqueMerge(neighbors, secondaryNeighbors);
                }
            }
            if (!isClustered(neighborIndex)) {
                addIndexToCluster(c, neighborIndex);
            }
        }
    };
    dataset.forEach((unused, index) => {
        if (!isVisited(index)) {
            markVisited(index);
            const neighbors = findNeighbors(index);
            if (neighbors.length < minimumPoints) {
                noise.push(index);
            }
            else {
                const clusterIndex = createCluster();
                addIndexToCluster(clusterIndex, index);
                expandCluster(clusterIndex, neighbors);
            }
        }
    });
    return { clusters, noise };
};
export default DBScan;
